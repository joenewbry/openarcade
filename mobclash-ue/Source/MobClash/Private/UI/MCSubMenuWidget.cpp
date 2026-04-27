#include "UI/MCSubMenuWidget.h"

#include "Components/Button.h"
#include "Components/TextBlock.h"

void UMCSubMenuWidget::NativePreConstruct()
{
	Super::NativePreConstruct();
	RefreshHeader();
}

void UMCSubMenuWidget::NativeConstruct()
{
	Super::NativeConstruct();

	if (BackButton)
	{
		BackButton->OnClicked.AddDynamic(this, &ThisClass::HandleBackClicked);
	}
}

void UMCSubMenuWidget::NativeDestruct()
{
	if (BackButton)
	{
		BackButton->OnClicked.RemoveAll(this);
	}

	Super::NativeDestruct();
}

void UMCSubMenuWidget::RefreshHeader()
{
	if (HeaderText)
	{
		const bool bHasCustomTitle = !ScreenTitle.IsEmpty();
		HeaderText->SetText(bHasCustomTitle ? ScreenTitle : UEnum::GetDisplayValueAsText(ScreenId));
	}
}

void UMCSubMenuWidget::HandleBackClicked()
{
	OnBackRequested.Broadcast(ScreenId);
}
